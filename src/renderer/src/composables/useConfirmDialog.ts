import { ref } from 'vue'

export type ConfirmDialogState = {
  show: boolean
  title: string
  message: string
  color: string
  confirmButtonColor: string
  icon: string
  confirmText: string
  cancelText: string
  loading: boolean
  action: () => void | Promise<void>
}

export const useConfirmDialog = () => {
  const confirmDialog = ref<ConfirmDialogState>({
    show: false,
    title: '',
    message: '',
    color: 'primary',
    confirmButtonColor: 'primary',
    icon: 'alert-circle',
    confirmText: 'تأكيد',
    cancelText: 'تراجع',
    loading: false,
    action: () => {}
  })

  const openConfirm = (options: {
    title: string
    message: string
    color?: string
    confirmButtonColor?: string
    icon?: string
    confirmText?: string
    cancelText?: string
    action: () => void | Promise<void>
  }) => {
    confirmDialog.value = {
      show: true,
      title: options.title,
      message: options.message,
      color: options.color || 'primary',
      confirmButtonColor: options.confirmButtonColor || 'primary',
      icon: options.icon || 'alert-circle',
      confirmText: options.confirmText || 'تأكيد',
      cancelText: options.cancelText || 'تراجع',
      loading: false,
      action: options.action
    }
  }

  const closeConfirm = () => {
    confirmDialog.value.show = false
    confirmDialog.value.loading = false
  }

  return { confirmDialog, openConfirm, closeConfirm }
}
