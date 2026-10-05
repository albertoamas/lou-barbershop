import { roleLabel, type ConfigurationSnapshot } from '../../../core/configuration/Configuration'
import { configurationApi } from '../../../infrastructure/http/configurationApi'
import { Button } from '../Button'
import type { Panel } from './configPanels'
import { SheetHeader } from './SheetHeader'

// An access account that no team member uses yet.
export const AccountSheet = ({
  userId,
  data,
  disabled,
  onClose,
  onOpen,
}: {
  userId: string
  data: ConfigurationSnapshot
  disabled: boolean
  onClose: () => void
  onOpen: (panel: Panel) => void
}) => {
  const user = data.users.find((item) => item.id === userId)
  if (!user)
    return (
      <>
        <SheetHeader title="Cuenta no encontrada" onClose={onClose} />
        <p className="text-ink-soft">Esta cuenta ya no está en la lista.</p>
      </>
    )
  const back: Panel = { kind: 'account', userId }
  return (
    <div className="grid gap-5">
      <SheetHeader title={user.userName} onClose={onClose}>
        <p className="mt-1 text-ink-soft">Cuenta de acceso sin persona en el equipo.</p>
      </SheetHeader>
      <dl className="grid gap-2">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Rol</dt>
          <dd className="font-semibold">{user.roles.map(roleLabel).join(', ') || 'Sin rol'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Estado</dt>
          <dd className="font-semibold">{user.active ? 'Puede entrar' : 'Desactivada'}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={disabled || !user.active}
          onClick={() => onOpen({ kind: 'create-team', back })}
        >
          Agregar como persona
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => onOpen({ kind: 'roles-users', id: user.id, back })}
        >
          Cambiar rol
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => onOpen({ kind: 'password-users', id: user.id, back })}
        >
          Cambiar contraseña
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() =>
            onOpen({
              kind: 'confirm',
              title: user.active ? 'Desactivar cuenta' : 'Activar cuenta',
              detail: user.active
                ? `La cuenta ${user.userName} no podrá entrar a la aplicación.`
                : `La cuenta ${user.userName} podrá volver a entrar.`,
              confirmLabel: user.active ? 'Desactivar cuenta' : 'Activar cuenta',
              action: () => configurationApi.setUserActive(user.id, !user.active),
              back,
            })
          }
        >
          {user.active ? 'Desactivar cuenta' : 'Activar cuenta'}
        </Button>
      </div>
    </div>
  )
}
