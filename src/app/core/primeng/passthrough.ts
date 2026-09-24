import type { GlobalPassThrough } from 'primeng/config';

// Pass-through preset for PrimeNG in Unstyled mode (RULES.md §5): every
// component used by the app gets its look from these Tailwind classes.
// Tokens (ink, line, brand, …) are defined in `src/styles.css` → `@theme`.
//
// Invalid fields: add the `is-invalid` class to the input (or to the PrimeNG
// host, e.g. `<p-inputnumber class="is-invalid">`) to get the red border.

const FOCUS_RING =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

const FIELD =
  'h-12 w-full rounded-[10px] border border-line bg-white px-3 text-[15px] text-ink ' +
  'placeholder:text-faint outline-none transition-shadow focus:ring-2 focus:ring-brand ' +
  'disabled:opacity-60 [&.is-invalid]:border-danger in-[.is-invalid]:border-danger';

interface ButtonOptions {
  severity?: string | null;
  size?: string | null;
  rounded?: boolean;
  text?: boolean;
  link?: boolean;
  outlined?: boolean;
  variant?: string;
  label?: string;
}

interface ButtonState extends ButtonOptions {
  hasIcon?: unknown;
  // p-confirmdialog configures its buttons through `buttonProps`.
  buttonProps?: ButtonOptions;
}

function buttonRoot({ instance: button }: { instance: ButtonState }): string {
  const props = button.buttonProps ?? {};
  const instance: ButtonState = {
    severity: button.severity ?? props.severity,
    size: button.size ?? props.size,
    rounded: button.rounded || props.rounded,
    text: button.text || props.text,
    link: button.link || props.link,
    outlined: button.outlined || props.outlined,
    variant: button.variant ?? props.variant,
    label: button.label ?? props.label,
    hasIcon: button.hasIcon,
  };
  const iconOnly = !!instance.hasIcon && !instance.label;
  const small = instance.size === 'small';
  const large = instance.size === 'large';
  const text = instance.text || instance.variant === 'text';
  const outlined = instance.outlined || instance.variant === 'outlined';

  const shape = instance.link
    ? 'h-auto p-0'
    : [
        small ? 'h-10 text-sm' : large ? 'h-14 text-[15px]' : 'h-12 text-[15px]',
        iconOnly ? (small ? 'w-10' : large ? 'w-14' : 'w-12') : 'px-4',
        instance.rounded ? 'rounded-full' : small ? 'rounded-lg' : 'rounded-[10px]',
      ].join(' ');

  let tone: string;
  if (instance.link) {
    tone = 'bg-transparent text-brand hover:text-brand-dark text-sm';
  } else if (text) {
    tone = 'bg-transparent text-muted hover:bg-subtle hover:text-ink';
  } else if (instance.severity === 'secondary') {
    tone = 'border border-line bg-white text-ink hover:bg-subtle';
  } else if (instance.severity === 'danger' && outlined) {
    tone = 'border border-line bg-white text-danger hover:bg-danger-hover';
  } else if (instance.severity === 'danger') {
    tone = 'bg-danger text-white hover:bg-danger-dark';
  } else {
    tone = 'bg-ink text-white hover:bg-ink/85';
  }

  return [
    'inline-flex shrink-0 select-none items-center justify-center gap-2 font-medium',
    'transition-colors disabled:cursor-not-allowed disabled:opacity-45',
    FOCUS_RING,
    shape,
    tone,
  ].join(' ');
}

const DIALOG_MASK = 'fixed inset-0 flex items-center justify-center bg-ink/45 p-4';
const DIALOG_ROOT =
  'flex w-[440px] max-w-full flex-col gap-[18px] rounded-2xl bg-white p-7 ' +
  'shadow-[0_20px_50px_rgba(22,24,29,0.25)] outline-none';

export const PASSTHROUGH: GlobalPassThrough = {
  button: {
    root: buttonRoot,
    icon: 'text-base leading-none',
    label: 'leading-none',
    loadingIcon: 'animate-spin',
  },

  inputText: { root: FIELD },

  password: {
    root: 'relative block w-full',
  },

  inputNumber: {
    root: 'relative block w-full',
  },

  select: {
    root:
      'relative inline-flex h-12 w-full cursor-pointer items-center rounded-[10px] border ' +
      'border-line bg-white text-[15px] text-ink transition-shadow ' +
      'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand',
    label: 'flex-1 truncate px-3 outline-none',
    dropdown: 'flex h-full w-10 items-center justify-center text-muted',
    dropdownIcon: 'size-3.5',
    overlay:
      'mt-1 overflow-hidden rounded-[10px] border border-line bg-white ' +
      'shadow-[0_6px_20px_rgba(22,24,29,0.12)]',
    listContainer: 'max-h-72 overflow-auto',
    list: 'flex flex-col gap-0.5 p-1',
    option:
      'flex cursor-pointer items-center rounded-lg px-3 py-2.5 text-[15px] text-ink ' +
      'data-[p-focused=true]:bg-subtle aria-selected:bg-brand-soft aria-selected:text-brand-dark',
    optionLabel: 'truncate',
    emptyMessage: 'px-3 py-2.5 text-sm text-muted',
    // `overlay` is bound by the Select template but missing from its PT typings.
  } as GlobalPassThrough['select'],

  splitter: {
    root: 'flex min-h-0 flex-1 overflow-hidden rounded-[14px] border border-line bg-white',
    panel: 'flex min-h-0 min-w-0 flex-col overflow-hidden',
    // PrimeNG puts ARIA on the handle without a role; the focusable handle
    // becomes the separator and the outer gutter is presentational.
    gutter: { class: 'flex w-3 shrink-0 cursor-col-resize items-center justify-center', role: 'none' },
    gutterHandle: {
      class: `h-10 w-1 rounded-full bg-line ${FOCUS_RING}`,
      role: 'separator',
      'aria-label': 'Redimensionar paneles',
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuenow': 50,
    },
  },

  slider: {
    root: 'relative h-1.5 w-full cursor-pointer rounded-full bg-subtle',
    range: 'absolute inset-y-0 left-0 rounded-full bg-brand',
    handle:
      'absolute top-1/2 -ml-2.5 size-5 -translate-y-1/2 rounded-full border-[3px] ' +
      `border-white bg-brand shadow-[0_1px_3px_rgba(0,0,0,0.25)] ${FOCUS_RING}`,
  },

  selectButton: {
    root: 'inline-flex gap-0.5 rounded-[9px] bg-canvas p-[3px]',
    pcToggleButton: {
      root:
        'h-[34px] min-w-10 rounded-[7px] px-2 font-mono text-xs font-medium text-muted ' +
        'transition-colors aria-pressed:bg-white aria-pressed:text-ink ' +
        `aria-pressed:shadow-[0_1px_2px_rgba(0,0,0,0.08)] ${FOCUS_RING}`,
      content: 'flex h-full items-center justify-center',
    },
  },

  dialog: {
    // p-confirmdialog adds a static role="alertdialog" to this wrapper; the
    // real, labelled dialog is the inner root element.
    host: { role: 'none' },
    mask: DIALOG_MASK,
    root: DIALOG_ROOT,
    header: 'flex flex-col gap-1.5',
    title: 'm-0 text-xl font-semibold',
    // The design has no close "×": Cancelar and Escape close the dialog.
    headerActions: 'hidden',
    content: 'flex flex-col gap-[18px]',
    footer: 'flex justify-end gap-2',
  },

  // p-confirmdialog renders a p-dialog internally, which already picks up the
  // `dialog` entry above; only its own sections are listed here.
  confirmDialog: {
    message: 'm-0 text-sm text-muted',
  },

  message: {
    root: ({ instance }: { instance: { severity?: unknown } }) => {
      const severity =
        typeof instance.severity === 'function' ? instance.severity() : instance.severity;
      return severity === 'error'
        ? 'rounded-[10px] border border-danger-line bg-danger-soft text-danger-dark'
        : 'rounded-[10px] border border-success-line bg-success-soft text-success';
    },
    content: 'flex items-center gap-2.5 px-3.5 py-2.5 text-sm',
    text: 'flex-1',
  },

  progressSpinner: {
    root: 'relative inline-block size-7',
    spin: 'size-full animate-spin',
    circle: 'fill-none stroke-brand [stroke-dasharray:60,200] [stroke-linecap:round]',
  },
};
