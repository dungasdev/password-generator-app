import Image from "next/image"
import fullLogo from "@/assets/full_logo.webp"

interface AmaraLogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

export default function AmaraLogo({ size = "md" }: AmaraLogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  }

  return (
    <div className="flex items-center gap-3">
      <Image
        src={fullLogo}
        alt="Amara Net Zero logo"
        className={`${sizeClasses[size].replace(" w-", " ")} w-auto`}
        priority
      />
    </div>
  )
}

export { AmaraLogo }
