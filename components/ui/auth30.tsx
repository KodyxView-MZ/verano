"use client";

import { Delete, Fingerprint } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Utility helper for conditional classes (shadcn style)
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export interface Auth30Props {
  heading?: string;
  description?: string;
  pinLength?: number;
  expectedPin?: string;
  logoSrc?: string;
  labels?: {
    biometric?: string;
    backspace?: string;
  };
  forgotPrompt?: {
    text: string;
    linkLabel: string;
    href: string;
  };
  onSuccess?: () => void;
  className?: string;
}

export const auth30Demo: Auth30Props = {
  heading: "Painel de Controle",
  description: "Digite o PIN de 6 dígitos para acessar o painel.",
  pinLength: 6,
  expectedPin: "202120",
  logoSrc: "/logons.png",
  labels: {
    biometric: "Usar biometria",
    backspace: "Apagar",
  },
  forgotPrompt: {
    text: "Esqueceu seu PIN de acesso?",
    linkLabel: "Redefinir com suporte",
    href: "#",
  },
};

export function Auth30({
  heading = "Painel de Controle",
  description = "Digite o PIN de 6 dígitos para acessar o painel.",
  pinLength = 6,
  expectedPin = "202120",
  logoSrc = "/logons.png",
  labels = {},
  forgotPrompt,
  onSuccess,
  className,
}: Auth30Props) {
  const [pin, setPin] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { biometric: biometricLabel = "Biometria", backspace: backspaceLabel = "Apagar" } = labels;

  const append = (digit: string) => {
    if (isError || isSuccess) return;
    setPin((value) => {
      const next = value.length < pinLength ? value + digit : value;
      if (next.length === pinLength) {
        validatePin(next);
      }
      return next;
    });
  };

  const backspace = () => {
    if (isError || isSuccess) return;
    setPin((value) => value.slice(0, -1));
  };

  const clearAll = () => {
    if (isError || isSuccess) return;
    setPin("");
  };

  const validatePin = (inputPin: string) => {
    if (expectedPin && inputPin === expectedPin) {
      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } else if (expectedPin) {
      setIsError(true);
      setTimeout(() => {
        setPin("");
        setIsError(false);
      }, 700);
    }
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <section
      className={cn(
        "flex min-h-screen items-center justify-center px-4 py-12 w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100",
        className,
      )}
    >
      <div className={cn(
        "w-full max-w-xs sm:max-w-sm text-center p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl shadow-2xl transition-all duration-300",
        isError && "animate-shake border-red-500/80 shadow-red-500/20"
      )}>
        {logoSrc && (
          <img
            src={logoSrc}
            alt="Logo"
            className="h-14 w-auto mx-auto mb-5 object-contain filter drop-shadow-sm"
          />
        )}

        {heading && (
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {heading}
          </h1>
        )}
        {description && (
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}

        {/* PIN Indicators */}
        <div className="mt-7 flex justify-center gap-3">
          {Array.from({ length: pinLength }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "w-3.5 h-3.5 rounded-full transition-all duration-200",
                isError
                  ? "bg-red-500 border-red-500 scale-110 shadow-md shadow-red-500/50"
                  : isSuccess
                  ? "bg-emerald-500 border-emerald-500 scale-110 shadow-md shadow-emerald-500/50"
                  : index < pin.length
                  ? "bg-slate-900 dark:bg-white scale-105 shadow-sm"
                  : "border border-slate-300 dark:border-slate-700 bg-transparent",
              )}
            />
          ))}
        </div>

        {isError && (
          <p className="mt-3 text-xs font-semibold text-red-500 animate-pulse">
            PIN incorreto. Tente novamente.
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="mt-8 grid grid-cols-3 place-items-center gap-3.5">
          {digits.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => append(digit)}
              className="flex w-16 h-16 items-center justify-center rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-2xl font-semibold text-slate-800 dark:text-slate-100 transition-all hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {digit}
            </button>
          ))}

          {/* Biometrics / Clear Button */}
          <button
            type="button"
            aria-label={biometricLabel}
            onClick={clearAll}
            className="flex w-16 h-16 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95"
          >
            <Fingerprint className="w-6 h-6" />
          </button>

          {/* Digit 0 */}
          <button
            type="button"
            onClick={() => append("0")}
            className="flex w-16 h-16 items-center justify-center rounded-full border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-2xl font-semibold text-slate-800 dark:text-slate-100 transition-all hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            aria-label={backspaceLabel}
            onClick={backspace}
            disabled={pin.length === 0}
            className="flex w-16 h-16 items-center justify-center rounded-full text-slate-400 dark:text-slate-500 transition-colors hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>

        {forgotPrompt && (
          <p className="mt-8 text-xs text-slate-400 dark:text-slate-500">
            {forgotPrompt.text}{" "}
            <Link
              href={forgotPrompt.href}
              className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              {forgotPrompt.linkLabel}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

export default Auth30;
