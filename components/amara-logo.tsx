import Image from "next/image"
import fullLogo from "@/assets/full_logo.webp"

interface AmaraLogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

export default function AmaraLogo({ size = "md", showText = false }: AmaraLogoProps) {
  const sizeClasses = {
    sm: "h-8 w-auto",
    md: "h-12 w-auto",
    lg: "h-16 w-auto",
  }

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  }

  return (
    <div className="flex items-center gap-3">
      <Image src={fullLogo || "/placeholder.svg"} alt="Amara Net Zero logo" className={sizeClasses[size]} priority />
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold text-foreground ${textSizeClasses[size]}`}>Amara Net Zero</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Gerador de Senhas</span>
        </div>
      )}
    </div>
  )
}

export { AmaraLogo }
