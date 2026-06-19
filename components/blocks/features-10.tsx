import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { BadgeCheck, CalendarCheck, LucideIcon, ShieldCheck } from "lucide-react"
import { ReactNode } from "react"

const GAMEPLAY_IMAGE =
  "https://play-lh.googleusercontent.com/zcYbwxtXyR-7fd-jwTnMfRypX94Ah90iLIhxfI4pUE0eU-jGhsZekgM05fUkyvzKR50Rp7H6jCNxiwKCG1O5N58=w526-h296"

const SERVICE_IMAGE =
  "https://play-lh.googleusercontent.com/dvTtkpm_Wq95GHr35BDoZ_9GFI1Yq2fz-qZm3BYtYV626kn6WV8dllJVwSZojNAoUVDuuxKoNcNN84_djNm1Xg=w526-h296"

export function Features() {
  return (
    <section className="rounded-[28px] border border-[#d8c3bd]/70 bg-white/72 px-4 py-10 shadow-[0_24px_70px_rgba(91,72,83,0.12)] backdrop-blur md:px-8 md:py-14">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 text-sm font-black uppercase tracking-normal text-[#8d6e63]">
            Premium Service System
          </p>
          <h2 className="text-3xl font-black leading-tight text-[#342d3b] md:text-4xl">
            ระบบบริการเกมที่ขายได้จริง ติดตามได้จริง และดูแลงานหลังบ้านครบ
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <FeatureCard>
            <CardHeader className="pb-3">
              <CardHeading
                icon={ShieldCheck}
                title="ตรวจสลิปและกันรายการซ้ำ"
                description="คัดกรองไฟล์รูป ตรวจ hash กันสลิปซ้ำ และเก็บหลักฐานให้ออเดอร์ตรวจย้อนหลังได้"
              />
            </CardHeader>

            <div className="relative mb-6 border-t border-dashed border-[#d8c3bd] sm:mb-0">
              <div className="absolute inset-0 bg-[radial-gradient(125%_125%_at_50%_0%,transparent_38%,rgba(216,195,189,.42),white_125%)]" />
              <div className="relative aspect-[76/48] p-3 md:p-6">
                <ServicePreview />
              </div>
            </div>
          </FeatureCard>

          <FeatureCard>
            <CardHeader className="pb-3">
              <CardHeading
                icon={CalendarCheck}
                title="ออเดอร์และสถานะงาน"
                description="ลูกค้าได้เลข ORD ทันที แอดมินเห็นรายการล่าสุด เปลี่ยนสถานะ และให้ลูกค้าตรวจเองได้"
              />
            </CardHeader>

            <CardContent>
              <div className="relative mb-6 sm:mb-0">
                <div className="absolute -inset-6 bg-[radial-gradient(50%_50%_at_75%_50%,transparent,rgba(255,255,255,.92)_100%)]" />
                <div className="relative aspect-[76/48] overflow-hidden border border-[#d8c3bd] bg-[#fbf7f4]">
                  <img
                    src={GAMEPLAY_IMAGE}
                    alt="ตัวอย่างเกมเพลย์บริการเกม"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-4 bottom-4 rounded-xl bg-white/88 p-3 text-sm font-bold text-[#342d3b] shadow-lg">
                    ORD tracking • Processing • Completed
                  </div>
                </div>
              </div>
            </CardContent>
          </FeatureCard>

          <FeatureCard className="p-6 lg:col-span-2">
            <div className="mx-auto my-4 max-w-2xl text-center">
              <BadgeCheck className="mx-auto mb-4 size-9 text-[#8d6e63]" />
              <p className="text-2xl font-black leading-snug text-[#342d3b]">
                โครงสร้างพร้อมต่อ backend จริง, backup ฐานข้อมูล, smoke test และ UAT ก่อนเปิดรับลูกค้า
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 overflow-hidden">
              <CircularUI label="Order" circles={[{ pattern: "primary" }, { pattern: "border" }]} />
              <CircularUI label="Slip" circles={[{ pattern: "blue" }, { pattern: "none" }]} />
              <CircularUI label="Admin" circles={[{ pattern: "border" }, { pattern: "primary" }]} />
              <CircularUI
                label="Backup"
                circles={[{ pattern: "primary" }, { pattern: "none" }]}
                className="hidden sm:block"
              />
            </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  )
}

interface FeatureCardProps {
  children: ReactNode
  className?: string
}

const FeatureCard = ({ children, className }: FeatureCardProps) => (
  <Card className={cn("group relative rounded-none border-[#d8c3bd] bg-white/76 shadow-zinc-950/5", className)}>
    <CardDecorator />
    {children}
  </Card>
)

const CardDecorator = () => (
  <>
    <span className="absolute -left-px -top-px block size-2 border-l-2 border-t-2 border-[#8d6e63]" />
    <span className="absolute -right-px -top-px block size-2 border-r-2 border-t-2 border-[#8d6e63]" />
    <span className="absolute -bottom-px -left-px block size-2 border-b-2 border-l-2 border-[#8d6e63]" />
    <span className="absolute -bottom-px -right-px block size-2 border-b-2 border-r-2 border-[#8d6e63]" />
  </>
)

interface CardHeadingProps {
  icon: LucideIcon
  title: string
  description: string
}

const CardHeading = ({ icon: Icon, title, description }: CardHeadingProps) => (
  <div className="p-6">
    <span className="flex items-center gap-2 text-sm font-black text-[#8d6e63]">
      <Icon className="size-4" />
      {title}
    </span>
    <p className="mt-7 text-2xl font-black leading-snug text-[#342d3b]">{description}</p>
  </div>
)

const ServicePreview = () => (
  <div className="grid h-full grid-cols-[1.1fr_.9fr] gap-3">
    <div className="overflow-hidden rounded-2xl border border-[#d8c3bd] bg-white">
      <img src={SERVICE_IMAGE} alt="ตัวอย่างเกมเพลย์จาก Play Store" className="h-full w-full object-cover" loading="lazy" />
    </div>
    <div className="grid gap-3 text-[#342d3b]">
      {["Slip OK", "No Duplicate", "Admin Review"].map((item) => (
        <div key={item} className="flex items-center justify-between rounded-2xl border border-[#d8c3bd] bg-white/88 px-3 font-black">
          <span>{item}</span>
          <span className="size-2 rounded-full bg-[#8d6e63]" />
        </div>
      ))}
    </div>
  </div>
)

interface CircleConfig {
  pattern: "none" | "border" | "primary" | "blue"
}

interface CircularUIProps {
  label: string
  circles: CircleConfig[]
  className?: string
}

const CircularUI = ({ label, circles, className }: CircularUIProps) => (
  <div className={className}>
    <div className="size-fit rounded-2xl bg-gradient-to-b from-[#d8c3bd] to-transparent p-px">
      <div className="relative flex aspect-square w-fit -space-x-4 rounded-[15px] bg-gradient-to-b from-white to-[#f3ece8] p-4">
        {circles.map((circle, i) => (
          <div
            key={i}
            className={cn("size-7 rounded-full border sm:size-8", {
              "border-[#8d6e63] bg-white": circle.pattern === "none",
              "border-[#8d6e63] bg-[repeating-linear-gradient(-45deg,#d8c3bd,#d8c3bd_1px,transparent_1px,transparent_4px)]": circle.pattern === "border",
              "border-[#8d6e63] bg-[#8d6e63]": circle.pattern === "primary",
              "border-[#7d6aa6] bg-[repeating-linear-gradient(-45deg,#7d6aa6,#7d6aa6_1px,white_1px,white_4px)]": circle.pattern === "blue",
            })}
          />
        ))}
      </div>
    </div>
    <span className="mt-1.5 block text-center text-sm font-bold text-[#6d6077]">{label}</span>
  </div>
)
