import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-primary via-primary to-[hsl(210,100%,40%)] text-primary-foreground shadow-[0_4px_0_0_hsl(210,100%,35%),0_6px_12px_-2px_hsl(210,100%,20%)] hover:shadow-[0_6px_0_0_hsl(210,100%,35%),0_8px_16px_-2px_hsl(210,100%,20%)] hover:-translate-y-0.5 active:shadow-[0_2px_0_0_hsl(210,100%,35%),0_3px_8px_-2px_hsl(210,100%,20%)] active:translate-y-0.5",
        destructive: "bg-gradient-to-b from-destructive to-[hsl(0,70%,40%)] text-destructive-foreground shadow-[0_4px_0_0_hsl(0,70%,35%),0_6px_12px_-2px_hsl(0,70%,20%)] hover:shadow-[0_6px_0_0_hsl(0,70%,35%),0_8px_16px_-2px_hsl(0,70%,20%)] hover:-translate-y-0.5 active:shadow-[0_2px_0_0_hsl(0,70%,35%),0_3px_8px_-2px_hsl(0,70%,20%)] active:translate-y-0.5",
        outline: "border-2 border-primary bg-gradient-to-b from-card to-secondary text-foreground shadow-[0_3px_0_0_hsl(220,25%,20%),0_4px_8px_-2px_hsl(220,40%,8%)] hover:shadow-[0_5px_0_0_hsl(220,25%,20%),0_6px_12px_-2px_hsl(220,40%,8%)] hover:-translate-y-0.5 active:shadow-[0_1px_0_0_hsl(220,25%,20%),0_2px_6px_-2px_hsl(220,40%,8%)] active:translate-y-0.5",
        secondary: "bg-gradient-to-b from-secondary to-[hsl(220,30%,15%)] text-secondary-foreground shadow-[0_3px_0_0_hsl(220,30%,12%),0_5px_10px_-2px_hsl(220,40%,8%)] hover:shadow-[0_5px_0_0_hsl(220,30%,12%),0_7px_14px_-2px_hsl(220,40%,8%)] hover:-translate-y-0.5 active:shadow-[0_1px_0_0_hsl(220,30%,12%),0_2px_6px_-2px_hsl(220,40%,8%)] active:translate-y-0.5",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
