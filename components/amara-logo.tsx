import Image from "next/image"
import fullLogo from "@/assets/full_logo.webp"

interface AmaraLogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
}

export default function AmaraLogo({ size = "md" }: AmaraLogoProps) {
  const sizeClasses = {
    sm: "h-9 w-9",
    md: "h-12 w-12",
    lg: "h-16 w-16",
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
