import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

// --- Global Toast Sound Monkey-Patch ---
const playToastSound = (type: "success" | "error" | "delete") => {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === "delete") {
      // Sweeping down sound for delete/discard
      osc.type = "sine";
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === "success") {
      // Pleasant high-pitched "ding" for save/create
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      // Deep "bloop" for errors
      osc.type = "square";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    // Ignore if audio fails
  }
};

if (typeof window !== "undefined") {
  const originalSuccess = toast.success;
  const originalError = toast.error;

  toast.success = (message, data) => {
    let soundType: "success" | "delete" = "success";
    if (typeof message === "string") {
      const msg = message.toLowerCase();
      if (msg.includes("delete") || msg.includes("remove") || msg.includes("clear") || msg.includes("void")) {
        soundType = "delete";
      }
    }
    playToastSound(soundType);
    return originalSuccess(message, data);
  };
  
  toast.error = (message, data) => {
    playToastSound("error");
    return originalError(message, data);
  };
}
// ----------------------------------------

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      duration={2000}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:min-w-[300px] group-[.toaster]:px-6 group-[.toaster]:py-5 group-[.toaster]:text-base group-[.toaster]:rounded-xl group-[.toaster]:border-2",
          title: "group-[.toast]:text-base group-[.toast]:font-semibold",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
