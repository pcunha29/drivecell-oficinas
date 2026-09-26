"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { BillingBlock, BillingBlockId } from "./blocks";

type BlockPickerProps = {
  blocks: readonly BillingBlock[];
  isVisible: (id: BillingBlockId) => boolean;
  setVisible: (id: BillingBlockId, visible: boolean) => void;
  reset: () => void;
};

/** Menu "Personalizar": mostra/esconde os blocos da página. */
export function BlockPicker({ blocks, isVisible, setVisible, reset }: BlockPickerProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-h-[44px] w-full sm:w-auto">
          <SlidersHorizontal aria-hidden />
          Personalizar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuPrimitive.Label className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Blocos visíveis
        </DropdownMenuPrimitive.Label>
        {blocks.map((block) => {
          const checked = isVisible(block.id);
          return (
            <DropdownMenuPrimitive.CheckboxItem
              key={block.id}
              checked={checked}
              onCheckedChange={(value) => setVisible(block.id, value === true)}
              onSelect={(e) => e.preventDefault()}
              className="relative flex min-h-[44px] cursor-pointer select-none items-center gap-3 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-muted"
            >
              <span
                aria-hidden
                className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] border ${
                  checked ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {checked && <Check className="size-3" strokeWidth={3} />}
              </span>
              {block.label}
            </DropdownMenuPrimitive.CheckboxItem>
          );
        })}
        <DropdownMenuPrimitive.Separator className="my-1 h-px bg-border" />
        <DropdownMenuPrimitive.Item
          onSelect={() => reset()}
          className="flex min-h-[44px] cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-muted-foreground outline-none focus:bg-muted focus:text-foreground"
        >
          Repor a vista original
        </DropdownMenuPrimitive.Item>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
