import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const labelVariants = cva(
  // Brand treatment: field labels use the brand green (--primary), which maps
  // to dark green #006838 in light mode (AA-contrast on white) and to lime in
  // dark mode. Callers can override text-* to opt out.
  'text-sm font-medium leading-none text-primary peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

export const Label = forwardRef<
  ElementRef<typeof LabelPrimitive.Root>,
  ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;
