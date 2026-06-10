"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

const Accordion = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col gap-3", className)} {...props} />
));
Accordion.displayName = "Accordion";

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-xl border border-mt-border bg-white px-5 py-2 transition-colors hover:border-mt-border-dark", className)}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { isOpen?: boolean }
>(({ className, children, isOpen, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "flex w-full flex-1 items-center justify-between py-3 font-semibold transition-all text-left",
      className
    )}
    {...props}
  >
    {children}
    <ChevronDown
      className={cn(
        "h-5 w-5 shrink-0 text-mt-text-tertiary transition-transform duration-200",
        isOpen && "rotate-180 text-mt-primary"
      )}
    />
  </button>
));
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { isOpen?: boolean }
>(({ className, children, isOpen, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "overflow-hidden text-sm text-mt-text-secondary transition-all duration-300 ease-in-out",
      isOpen ? "max-h-96 pb-4 opacity-100" : "max-h-0 opacity-0"
    )}
    {...props}
  >
    <div className={cn("pt-1", className)}>{children}</div>
  </div>
));
AccordionContent.displayName = "AccordionContent";

// Helper component for simple usage
export function SimpleAccordion({ 
  items 
}: { 
  items: { question: string; answer: string }[] 
}) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  return (
    <Accordion>
      {items.map((item, index) => (
        <AccordionItem key={index} value={index.toString()}>
          <AccordionTrigger 
            isOpen={openIndex === index}
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            {item.question}
          </AccordionTrigger>
          <AccordionContent isOpen={openIndex === index}>
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
