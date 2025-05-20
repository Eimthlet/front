// Declare Material UI icons module
declare module '@mui/icons-material/*' {
  import { SvgIconProps } from '@mui/material/SvgIcon';
  import * as React from 'react';
  
  const IconComponent: React.FC<SvgIconProps>;
  
  export default IconComponent;
}
