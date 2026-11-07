"use client";

import { CircleCheck, LoaderCircle } from "lucide-react";
import { createContext, use, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type ActionState, initialActionState } from "@/lib/actions/state";
import { cn } from "@/lib/utils";

const FormStateContext = createContext<ActionState>(initialActionState);

function SubmitButton({
  label,
  variant,
  size,
  fullWidth,
}: {
  label: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  fullWidth?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant={variant} size={size} disabled={pending} className={fullWidth ? "w-full" : undefined}>
      {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
      {label}
    </Button>
  );
}

export function ActionForm({
  action,
  submitLabel,
  submitVariant,
  submitSize,
  fullWidth,
  className,
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  submitVariant?: React.ComponentProps<typeof Button>["variant"];
  submitSize?: React.ComponentProps<typeof Button>["size"];
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, initialActionState);

  return (
    <FormStateContext value={state}>
      <form action={formAction} className={cn("space-y-4", className)} noValidate>
        {state.status === "error" && state.message ? (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
        {state.status === "success" && state.message ? (
          <Alert>
            <CircleCheck aria-hidden="true" />
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
        {children}
        <SubmitButton label={submitLabel} variant={submitVariant} size={submitSize} fullWidth={fullWidth} />
      </form>
    </FormStateContext>
  );
}

function FieldMessage({ id, errors, hint }: { id: string; errors?: string[]; hint?: string }) {
  if (errors?.length) {
    return (
      <p id={`${id}-message`} className="text-sm text-destructive">
        {errors[0]}
      </p>
    );
  }
  return hint ? (
    <p id={`${id}-message`} className="text-sm text-muted-foreground">
      {hint}
    </p>
  ) : null;
}

type FieldBase = { name: string; label: string; hint?: string };

export function Field({ name, label, hint, defaultValue, ...props }: FieldBase & React.ComponentProps<"input">) {
  const state = use(FormStateContext);
  const errors = state.fieldErrors?.[name];

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        className="h-10 bg-card"
        defaultValue={state.values?.[name] ?? defaultValue}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length || hint ? `${name}-message` : undefined}
        {...props}
      />
      <FieldMessage id={name} errors={errors} hint={hint} />
    </div>
  );
}

export function TextareaField({
  name,
  label,
  hint,
  defaultValue,
  ...props
}: FieldBase & React.ComponentProps<"textarea">) {
  const state = use(FormStateContext);
  const errors = state.fieldErrors?.[name];

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Textarea
        id={name}
        name={name}
        className="min-h-24 bg-card"
        defaultValue={state.values?.[name] ?? defaultValue}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length || hint ? `${name}-message` : undefined}
        {...props}
      />
      <FieldMessage id={name} errors={errors} hint={hint} />
    </div>
  );
}

export function SelectField({
  name,
  label,
  hint,
  options,
  placeholder,
  defaultValue,
}: FieldBase & {
  options: { value: string; label: string }[];
  placeholder?: string;
  defaultValue?: string;
}) {
  const state = use(FormStateContext);
  const errors = state.fieldErrors?.[name];

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        key={state.values?.[name] ?? defaultValue}
        defaultValue={state.values?.[name] ?? defaultValue ?? ""}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={errors?.length || hint ? `${name}-message` : undefined}
        className="h-10 w-full rounded-lg border border-input bg-card px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldMessage id={name} errors={errors} hint={hint} />
    </div>
  );
}

export function CheckboxField({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: React.ReactNode;
  defaultChecked?: boolean;
}) {
  const state = use(FormStateContext);
  const errors = state.fieldErrors?.[name];
  const refill = state.values ? state.values[name] === "on" : defaultChecked;

  return (
    <div className="space-y-1.5">
      <label className="flex cursor-pointer gap-2.5 text-sm">
        <input
          key={String(refill)}
          type="checkbox"
          name={name}
          defaultChecked={refill}
          className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
        />
        <span>{label}</span>
      </label>
      <FieldMessage id={name} errors={errors} />
    </div>
  );
}

export function RadioCards({
  name,
  legend,
  options,
  defaultValue,
}: {
  name: string;
  legend: string;
  options: { value: string; title: string; description: string }[];
  defaultValue: string;
}) {
  const state = use(FormStateContext);
  const selected = state.values?.[name] ?? defaultValue;

  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="mt-1.5 grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer gap-3 rounded-lg border bg-card p-3.5 transition-colors has-checked:border-brand has-checked:bg-brand-soft has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={option.value === selected}
              className="mt-0.5 size-4 accent-[var(--brand)]"
            />
            <span>
              <span className="block text-sm font-medium">{option.title}</span>
              <span className="block text-sm text-muted-foreground">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
      <FieldMessage id={name} errors={state.fieldErrors?.[name]} />
    </fieldset>
  );
}

export function ChoiceGroup({
  name,
  legend,
  options,
}: {
  name: string;
  legend: string;
  options: readonly { value: string; label: string }[];
}) {
  const state = use(FormStateContext);
  const errors = state.fieldErrors?.[name];

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-4">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 rounded-lg border bg-card p-2.5 text-sm transition-colors has-checked:border-brand has-checked:bg-brand-soft has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={state.values?.[name] === option.value}
              className="size-4 shrink-0 accent-[var(--brand)]"
            />
            {option.label}
          </label>
        ))}
      </div>
      <FieldMessage id={name} errors={errors} />
    </fieldset>
  );
}
