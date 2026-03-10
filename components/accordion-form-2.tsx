import type { ReactNode } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  User02Icon,
  Mail01Icon,
  MapPinIcon,
  Add01Icon,
  Delete01Icon,
} from "@hugeicons/core-free-icons";

export const title = "Form with Plus Trigger";

type FormSection = {
  id: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  isComplete?: boolean;
};

const sections: FormSection[] = [
  {
    id: "personal",
    icon: <HugeiconsIcon icon={User02Icon} strokeWidth={2} className="size-4 text-muted-foreground" />,
    title: "Personal Information",
    children: (
      <div className="flex flex-col gap-2">
        <Input placeholder="First Name" type="text" />
        <Input placeholder="Last Name" type="text" />
      </div>
    ),
  },
  {
    id: "contact",
    icon: <HugeiconsIcon icon={Mail01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />,
    title: "Contact Information",
    children: (
      <div className="flex flex-col gap-2">
        <Input placeholder="Email" type="email" />
        <Input placeholder="Phone" type="tel" />
      </div>
    ),
  },
  {
    id: "address",
    icon: <HugeiconsIcon icon={MapPinIcon} strokeWidth={2} className="size-4 text-muted-foreground" />,
    title: "Address Information",
    children: (
      <div className="flex flex-col gap-2">
        <Input placeholder="Street" type="text" />
        <Input placeholder="City" type="text" />
        <Input placeholder="State" type="text" />
        <Input placeholder="Zip" type="text" />
      </div>
    ),
  },
];

const Example = () => (
  <Accordion className="w-full max-w-md -space-y-px">
    {sections.map((section) => (
      <AccordionItem
        className="overflow-hidden border bg-background px-4 first:rounded-t-lg last:rounded-b-lg last:border-b"
        key={section.id}
        value={section.id}
      >
        <AccordionTrigger className="group hover:no-underline [&>svg]:hidden">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              {section.icon}
              <span>{section.title}</span>
              {section.isComplete && (
                <span className="ml-2 text-sm text-green-500">✓</span>
              )}
            </div>
            <div className="relative size-4 shrink-0">
              <HugeiconsIcon icon={Add01Icon} className="absolute inset-0 size-4 text-muted-foreground transition-opacity duration-200 group-data-[state=open]:opacity-0" />
              <HugeiconsIcon icon={Delete01Icon} className="absolute inset-0 size-4 text-muted-foreground opacity-0 transition-opacity duration-200 group-data-[state=open]:opacity-100" />
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>{section.children}</AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);

export default Example;
