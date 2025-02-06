import AlertIcon from "@/assets/svg/AlertIcon.svg";
import LightBulb from "@/assets/svg/lightbulb.svg";
export default function Footer() {
  return (
    <footer className="fixed bottom-0  w-[calc(100%-5rem)] left-[80px]  h-[36px] bg-[#F2F2F2] border-t border-[#E2E2E2] flex items-center justify-between pr-4 ">
    {/* Left Section - Alert Box */}
    <div className="w-[208px] h-[36px] bg-[#FFAA49] flex items-center gap-[8px] px-[10px] justify-center">
      <AlertIcon />
      {/* Alert Text */}
      <span className="text-[#603403] font-urbanist font-medium text-[14px] leading-[20px]">
        Alert
      </span>
    </div>
  
    {/* Right Section - Tips */}
    <div className="flex items-center gap-[6px]">
      {/* Lightbulb Icon */}
      <LightBulb />
      {/* Tips Text */}
      <span className="text-[#603403] font-urbanist font-medium text-[14px] leading-[20px]">
        Tips: You can verify the client
      </span>
    </div>
  </footer>
  

  );
}
