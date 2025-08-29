import { Shield } from "lucide-react"

interface AmaraLogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

export default function AmaraLogo({ size = "md", showText = true }: AmaraLogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Shield className={`${sizeClasses[size]} text-emerald-600`} />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizeClasses[size]} font-bold text-foreground leading-none`}>Amara</span>
          <span className="text-xs text-emerald-600 font-medium leading-none">NET ZERO</span>
        </div>
      )}
    </div>
  )
}

export { AmaraLogo }
