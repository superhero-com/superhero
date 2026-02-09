import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Select as BaseSelect,
  SelectContent as BaseSelectContent,
  SelectTrigger as BaseSelectTrigger,
  SelectValue as BaseSelectValue,
  SelectItem as BaseSelectItem,
} from '@/components/ui/select';

type Option = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

export interface AppSelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options?: Option[];
  disabled?: boolean;
  // Styling passthroughs to preserve per-usage sizing and spacing
  triggerClassName?: string;
  contentClassName?: string;
  itemClassName?: string;
  // Popper positioning passthrough
  side?: React.ComponentProps<typeof BaseSelectContent>['side'];
  align?: React.ComponentProps<typeof BaseSelectContent>['align'];
  // For fully custom item rendering
  children?: React.ReactNode;
}

export default function AppSelect(props: AppSelectProps) {
  const {
    value,
    defaultValue,
    onValueChange,
    placeholder,
    options,
    disabled,
    triggerClassName,
    contentClassName,
    itemClassName,
    side,
    align,
    children,
  } = props;

  return (
    <BaseSelect value={value} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled}>
      <BaseSelectTrigger className={cn(triggerClassName)}>
        <BaseSelectValue placeholder={placeholder} />
      </BaseSelectTrigger>
      <BaseSelectContent className={cn(contentClassName)} side={side} align={align}>
        {options
          ? options.map((opt) => (
            <Item key={opt.value} value={opt.value} disabled={opt.disabled} className={itemClassName}>
              {opt.label}
            </Item>
          ))
          : children}
      </BaseSelectContent>
    </BaseSelect>
  );
}

// Named wrapper export for convenience
export const Item = ({ className, ...rest }: React.ComponentProps<typeof BaseSelectItem>) => <BaseSelectItem className={className} {...rest} />;
