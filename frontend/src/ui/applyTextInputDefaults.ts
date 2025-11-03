// src/ui/applyTextInputDefaults.ts
import { TextInput } from 'react-native';

let installed = false;
export function applyTextInputDefaults() {
  if (installed) return;
  installed = true;

  const dp: any = (TextInput as any).defaultProps || {};
  (TextInput as any).defaultProps = {
    ...dp,
    placeholderTextColor: dp.placeholderTextColor ?? '#9CA3AF',
    style: [dp.style, { color: '#11181C' }],
  };
}
