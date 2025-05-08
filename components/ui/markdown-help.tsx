import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function MarkdownHelp() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help" />
        </TooltipTrigger>
        <TooltipContent className="max-w-[300px] p-4">
          <div className="space-y-2">
            <h4 className="font-medium">Markdown Support</h4>
            <div className="text-sm space-y-1">
              <p>
                <code>**bold**</code> - Bold text
              </p>
              <p>
                <code>*italic*</code> - Italic text
              </p>
              <p>
                <code>[text](url)</code> - Links
              </p>
              <p>
                <code># heading</code> - Headers
              </p>
              <p>
                <code>- item</code> - Lists
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
