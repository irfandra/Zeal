import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Platform, View } from 'react-native';

const IconSymbolIOS = Platform.OS === 'ios' ? require('./icon-symbol.ios').IconSymbol : null;

const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'cube.box.fill': 'inventory-2',
  'archivebox.fill': 'inventory-2',
  'qrcode.viewfinder': 'qr-code-scanner',
  'qr-code-scanner.fill': 'qr-code-scanner',
  'person.fill': 'person',
  'building.2.fill': 'business',
  'person.crop.circle.fill': 'account-circle',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
};


export function IconSymbol({ name, size = 24, color, style, weight }) {

  if (Platform.OS === 'ios' && IconSymbolIOS) {
    return (
      <IconSymbolIOS
        name={name}
        size={size}
        color={color}
        style={style}
        weight={weight}
      />
    );
  }

  return (
    <View style={[{ width: size, height: size }, style]}>
      <MaterialIcons
        name={MAPPING[name]}
        size={size}
        color={color}
      />
    </View>
  );
}