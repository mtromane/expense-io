export type ExpenseNoteStatus = 'pending' | 'approved' | 'rejected'

/** Règle métier : une note déjà approuvée ou rejetée ne se tranche plus. */
export class NoteAlreadyDecidedError extends Error {
  constructor() {
    super('Cette note a déjà été tranchée.')
    this.name = 'NoteAlreadyDecidedError'
  }
}

export interface ExpenseNoteProps {
  id: string
  userId: string
  amount: number
  expenseDate: string
  description: string
  receiptKey: string
  status: ExpenseNoteStatus
  /** Horodatage ISO de création, renseigné pour une note lue en base. */
  createdAt?: string
}

export class ExpenseNote {
  constructor(private readonly props: ExpenseNoteProps) {}

  get id(): string {
    return this.props.id
  }

  get status(): ExpenseNoteStatus {
    return this.props.status
  }

  canBeDecided(): boolean {
    return this.props.status === 'pending'
  }

  approve(): ExpenseNote {
    if (!this.canBeDecided()) {
      throw new NoteAlreadyDecidedError()
    }
    return new ExpenseNote({ ...this.props, status: 'approved' })
  }

  reject(): ExpenseNote {
    if (!this.canBeDecided()) {
      throw new NoteAlreadyDecidedError()
    }
    return new ExpenseNote({ ...this.props, status: 'rejected' })
  }

  toJSON(): ExpenseNoteProps {
    return { ...this.props }
  }
}
