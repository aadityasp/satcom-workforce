import { SvgProps } from 'react-native-svg';

declare module 'lucide-react-native' {
  import { FC } from 'react';

  interface LucideProps extends SvgProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
  }

  type LucideIcon = FC<LucideProps>;
}
