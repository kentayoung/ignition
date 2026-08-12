import { Button } from '@mui/material'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'

interface Props {
  onPick: () => void
  disabled?: boolean
}

export function AddProgramButton({ onPick, disabled }: Props): JSX.Element {
  return (
    <Button
      variant="outlined"
      startIcon={<AddCircleOutlineIcon />}
      onClick={onPick}
      disabled={disabled}
    >
      Add Program
    </Button>
  )
}
