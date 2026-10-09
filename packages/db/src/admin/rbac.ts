/** Papéis e permissões da equipe (docs/07 §7.7). Comercial não edita notas; editor não vê comissão. */
export const ROLES = ["admin", "editor_chefe", "editor", "analista_dados", "comercial", "leitor"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = {
  "dashboard:read": ["admin", "editor_chefe", "editor", "analista_dados", "comercial", "leitor"],
  "catalog:write": ["admin", "editor_chefe", "editor", "analista_dados"],
  "offers:write": ["admin", "editor_chefe", "analista_dados"],
  "content:write": ["admin", "editor_chefe", "editor"],
  "content:publish": ["admin", "editor_chefe"],
  "scores:adjust": ["admin", "editor_chefe"],
  "commission:read": ["admin", "comercial"],
  "audit:read": ["admin", "editor_chefe"],
  "staff:manage": ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  editor_chefe: "Editor-chefe",
  editor: "Editor",
  analista_dados: "Analista de dados",
  comercial: "Comercial",
  leitor: "Leitor",
};

export class ForbiddenError extends Error {
  constructor(permission: Permission) {
    super(`Sem permissão: ${permission}`);
  }
}
