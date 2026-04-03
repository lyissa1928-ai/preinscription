export const UserRole = {
  ADMIN: 'ADMIN',
  FARMER: 'FARMER',
  AGRONOMIST: 'AGRONOMIST',
  TECHNICIAN: 'TECHNICIAN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.FARMER,
  UserRole.AGRONOMIST,
  UserRole.TECHNICIAN,
];

export type RoleLevel = Record<UserRole, number>;

export const ROLE_HIERARCHY: RoleLevel = {
  [UserRole.ADMIN]: 4,
  [UserRole.AGRONOMIST]: 3,
  [UserRole.TECHNICIAN]: 2,
  [UserRole.FARMER]: 1,
};

export function hasRequiredRole(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
