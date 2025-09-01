import Image from "next/image"

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
        src="/amara-logo.png"
        alt="Amara Net Zero logo"
        width={32}
        height={32}
        className={`${sizeClasses[size]} object-contain`}
        priority
      />
    </div>
  )
}

export { AmaraLogo }
