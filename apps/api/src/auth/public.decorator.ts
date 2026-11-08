import { SetMetadata } from '@nestjs/common';
export const PUBLIC_ROUTE = 'specbridge:public';
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);
