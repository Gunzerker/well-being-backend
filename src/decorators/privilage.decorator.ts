import { SetMetadata } from '@nestjs/common';
import { PERMISSION_KEY, ROLES_KEY } from 'src/constantes/constantes';
import { permission, privilege } from 'src/shared/enums';

//export const Roles = (...roles: privilege[]) => SetMetadata(ROLES_KEY, roles);
export const Roles = (...roles: privilege[]) => SetMetadata('roles', roles);
export const PermissionNeeded = (...roles: permission[]) =>
  SetMetadata(PERMISSION_KEY, roles);
//!@Roles(privilege.CLIENT)
