import { AlertIcon, LightBulb } from "@/assets/index";
import Tooltip from "@/components/Tooltip"
export default function Footer() {
  return (
    <footer className="fixed bottom-0  w-[calc(100%-5rem)] left-[80px]  h-[36px] bg-[#F2F2F2] border-t border-[#E2E2E2] flex items-center justify-between pr-4 ">
      <Tooltip content="Scam Alerts">
      <div className="w-[208px] h-[36px] bg-[#FFAA49] flex items-center gap-[8px] px-[10px] justify-center">
        <AlertIcon />
        <span className="text-[#603403] font-urbanist font-medium text-[14px] leading-[20px]">
          Alert
        </span>
      </div>
      </Tooltip>
      <div className="flex items-center gap-[6px]">
        <LightBulb />
        <span className="text-[#603403] font-urbanist font-medium text-[14px] leading-[20px]">
          Tips: You can verify the client
        </span>
      </div>
    </footer>
  );
}
