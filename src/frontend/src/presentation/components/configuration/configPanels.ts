export type EditorKind =
  | 'create-team'
  | 'edit-team'
  | 'create-barber'
  | 'edit-barber'
  | 'create-services'
  | 'edit-services'
  | 'create-offerings'
  | 'create-products'
  | 'edit-products'
  | 'create-commissions'
  | 'create-expenses'
  | 'edit-expenses'
  | 'create-users'
  | 'roles-users'
  | 'password-users'

// What the side sheet shows. Forms and confirmations remember where they were opened
// from, so saving or cancelling inside a person's file returns to that file.
export type Panel =
  | { kind: 'person'; staffId: string }
  | { kind: 'account'; userId: string }
  | { kind: EditorKind; id?: string; barberId?: string; back?: Panel }
  | {
      kind: 'confirm'
      title: string
      detail: string
      confirmLabel: string
      action: () => Promise<unknown>
      refresh?: string[][]
      back?: Panel
    }

export const editorTitles: Record<EditorKind, string> = {
  'create-team': 'Agregar persona',
  'edit-team': 'Cambiar datos',
  'create-barber': 'Habilitar como barbero',
  'edit-barber': 'Cambiar datos de barbero',
  'create-services': 'Nuevo servicio',
  'edit-services': 'Editar servicio',
  'create-offerings': 'Nuevo precio',
  'create-products': 'Nuevo producto',
  'edit-products': 'Editar producto',
  'create-commissions': 'Nueva comisión',
  'create-expenses': 'Nueva categoría de gasto',
  'edit-expenses': 'Editar categoría',
  'create-users': 'Nueva cuenta de acceso',
  'roles-users': 'Cambiar rol',
  'password-users': 'Cambiar contraseña',
}

export const panelLabel = (panel: Panel) =>
  panel.kind === 'person'
    ? 'Ficha de la persona'
    : panel.kind === 'account'
      ? 'Cuenta de acceso'
      : panel.kind === 'confirm'
        ? panel.title
        : editorTitles[panel.kind]
