"""
Tests des avis : calcul des notes, idempotence, contrôles d'accès de la route (Firestore simulé).
"""

from app.routes import reviews
from app.services import review_stats

SERVER_TS = "SERVER_TIMESTAMP"


# --------------------------------------------------------------------------- Firestore simulé (avec requêtes)
class FakeSnapshot:
    def __init__(self, doc_id, data):
        self.id = doc_id
        self._data = data

    @property
    def exists(self):
        return self._data is not None

    def to_dict(self):
        return dict(self._data) if self._data is not None else None


class FakeDocument:
    def __init__(self, store, collection, doc_id):
        self._store = store
        self._collection = collection
        self.id = doc_id
        self._path = f"{collection}/{doc_id}"

    def get(self):
        return FakeSnapshot(self.id, self._store.get(self._path))

    def set(self, data, merge=False):
        if merge and self._path in self._store:
            self._store[self._path] = {**self._store[self._path], **data}
        else:
            self._store[self._path] = dict(data)


class FakeQuery:
    def __init__(self, store, collection, field=None, value=None):
        self._store, self._collection, self._field, self._value = store, collection, field, value

    def where(self, *args, filter=None, **kwargs):
        if filter is not None:
            return FakeQuery(self._store, self._collection, filter.field_path, filter.value)
        field, _op, value = args
        return FakeQuery(self._store, self._collection, field, value)

    def stream(self):
        prefix = f"{self._collection}/"
        for path, data in list(self._store.items()):
            if not path.startswith(prefix):
                continue
            if self._field is not None and data.get(self._field) != self._value:
                continue
            yield FakeSnapshot(path[len(prefix):], data)


class FakeCollection(FakeQuery):
    def document(self, doc_id):
        return FakeDocument(self._store, self._collection, doc_id)


class FakeDb:
    def __init__(self, initial=None):
        self.store = dict(initial or {})

    def collection(self, name):
        return FakeCollection(self.store, name)


def base_db():
    return FakeDb(
        {
            "users/aidant": {"displayName": "Aidant", "isAidant": True},
            "users/client": {"displayName": "Client"},
            "users/admin": {"displayName": "Admin", "isAdmin": True},
            "conversations/client_aidant": {
                "participants": ["client", "aidant"],
                "clientId": "client",
                "aidantId": "aidant",
                "status": "evaluation",
                "secteur": "Aide au repas",
                "jour": "28/09/2026",
            },
        }
    )


# --------------------------------------------------------------------------- calculs
def test_compute_stats_ignores_invalid_ratings():
    stats = review_stats.compute_stats([5, 4, "3", 0, 9, None, "x"])

    assert stats["totalReviews"] == 3
    assert stats["averageRating"] == 4.0
    assert stats["ratingDistribution"] == {"1": 0, "2": 0, "3": 1, "4": 1, "5": 1}


def test_compute_stats_empty():
    assert review_stats.compute_stats([]) == {
        "averageRating": 0,
        "totalReviews": 0,
        "ratingDistribution": {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
    }


def test_upsert_is_idempotent_and_recompute_writes_user_profile():
    db = base_db()
    kwargs = dict(
        aidant_id="aidant", client_id="client", conversation_id="client_aidant", rating=4, comment="Très bien",
        client_name="Client", service_date="28/09/2026", secteur="Aide au repas", duree_service=3, montant_service=60,
        server_timestamp=SERVER_TS,
    )

    first = review_stats.upsert_review(db, **kwargs)
    second = review_stats.upsert_review(db, **{**kwargs, "rating": 2, "comment": "Finalement moyen"})

    assert first["created"] is True and second["created"] is False
    assert first["reviewId"] == second["reviewId"] == "client_aidant__client"
    assert len([k for k in db.store if k.startswith("avis/")]) == 1
    assert db.store["avis/client_aidant__client"]["rating"] == 2

    # un second client note le même aidant
    db.store["avis/autre__c2"] = {"aidantId": "aidant", "clientId": "c2", "rating": 5}
    stats = review_stats.recompute_aidant_stats(db, "aidant", SERVER_TS)

    assert stats["averageRating"] == 3.5 and stats["totalReviews"] == 2
    assert db.store["users/aidant"]["averageRating"] == 3.5
    assert db.store["users/aidant"]["displayName"] == "Aidant"  # merge : le profil est conservé
    assert db.store["aidant_stats/aidant"]["totalReviews"] == 2


def test_recompute_all_covers_every_aidant_with_reviews():
    db = base_db()
    db.store["avis/a"] = {"aidantId": "aidant", "rating": 4}
    db.store["avis/b"] = {"aidantId": "autre", "rating": 1}
    db.store["users/autre"] = {"isAidant": True}

    result = review_stats.recompute_all_stats(db, SERVER_TS)

    assert result == {"aidants": 2}
    assert db.store["users/aidant"]["averageRating"] == 4.0
    assert db.store["users/autre"]["averageRating"] == 1.0


# --------------------------------------------------------------------------- route HTTP
def as_user(monkeypatch, uid, db):
    monkeypatch.setattr(reviews, "verify_bearer_token", lambda authorization, *, required=False: {"uid": uid})
    monkeypatch.setattr(reviews, "get_firestore_client", lambda: db)
    monkeypatch.setattr(reviews, "_server_timestamp", lambda: SERVER_TS)


REVIEW = {"aidantId": "aidant", "conversationId": "client_aidant", "rating": 5, "comment": "Parfait"}


def test_create_review_requires_token(client, monkeypatch):
    monkeypatch.setattr(reviews, "get_firestore_client", lambda: base_db())

    response = client.post("/api/reviews", json=REVIEW)

    assert response.status_code == 401


def test_create_review_success_updates_aidant_rating(client, monkeypatch):
    db = base_db()
    as_user(monkeypatch, "client", db)

    response = client.post("/api/reviews", headers={"Authorization": "Bearer t"}, json=REVIEW)

    assert response.status_code == 201
    body = response.json()
    assert body["created"] is True and body["averageRating"] == 5.0 and body["totalReviews"] == 1
    assert db.store["users/aidant"]["averageRating"] == 5.0
    assert db.store["avis/client_aidant__client"]["secteur"] == "Aide au repas"  # complété depuis la conversation


def test_create_review_rejects_non_participant(client, monkeypatch):
    as_user(monkeypatch, "intrus", base_db())

    response = client.post("/api/reviews", headers={"Authorization": "Bearer t"}, json=REVIEW)

    assert response.status_code == 403


def test_create_review_rejects_aidant_reviewing_himself(client, monkeypatch):
    as_user(monkeypatch, "aidant", base_db())

    response = client.post("/api/reviews", headers={"Authorization": "Bearer t"}, json=REVIEW)

    assert response.status_code == 403


def test_create_review_rejects_unfinished_service(client, monkeypatch):
    db = base_db()
    db.store["conversations/client_aidant"]["status"] = "acompte_paye"
    as_user(monkeypatch, "client", db)

    response = client.post("/api/reviews", headers={"Authorization": "Bearer t"}, json=REVIEW)

    assert response.status_code == 409


def test_create_review_validates_rating_bounds(client, monkeypatch):
    as_user(monkeypatch, "client", base_db())

    response = client.post("/api/reviews", headers={"Authorization": "Bearer t"}, json={**REVIEW, "rating": 6})

    assert response.status_code == 422


def test_recompute_is_admin_only(client, monkeypatch):
    db = base_db()
    db.store["avis/x"] = {"aidantId": "aidant", "rating": 3}
    as_user(monkeypatch, "client", db)
    forbidden = client.post("/api/reviews/recompute", headers={"Authorization": "Bearer t"})

    as_user(monkeypatch, "admin", db)
    allowed = client.post("/api/reviews/recompute", headers={"Authorization": "Bearer t"})

    assert forbidden.status_code == 403
    assert allowed.status_code == 200 and allowed.json() == {"aidants": 1}
    assert db.store["users/aidant"]["averageRating"] == 3.0
