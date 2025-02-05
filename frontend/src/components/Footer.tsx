import AlertIcon from "@/assets/svg/AlertIcon.svg";
import LightBulb from "@/assets/svg/lightbulb-02.svg";
export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-[80px] w-[1360px] h-[36px] bg-[#F2F2F2] border-t border-[#E2E2E2] flex items-center justify-between px-4">
      {/* Left Section - Alert Box */}
      <div className="w-[208px] h-[36px] bg-[#FFAA49] flex items-center gap-[8px] px-[10px]">
        {/* Alert Icon */}
        {/* <AlertTriangle className="w-[16px] h-[16px] text-[#854700]" /> */}
        <AlertIcon/>
        {/* Alert Text */}
        <span className="text-[#603403] font-urbanist font-medium text-[14px] leading-[20px]">
          Alert
        </span>
      </div>

      {/* Right Section - Tips */}
      <div className="w-[202px] h-[20px] flex items-center gap-[6px]">
        {/* Lightbulb Icon */}
        {/* <Lightbulb className="w-[18px] h-[18px] text-[#FFAA49]" /> */}
        <LightBulb/>
        {/* Tips Text */}
        <span className="text-[#603403] font-urbanist font-medium text-[14px] leading-[20px]">
          Tips: You can verify the client
        </span>
      </div>
    </footer>
  );
}
