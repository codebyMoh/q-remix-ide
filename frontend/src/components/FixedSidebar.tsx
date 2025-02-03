import Image from "next/image";
import Logo from "../assets/svg/logo.svg"; // Adjust path as necessary

const FixedSidebar = () => {
  return (
    <div className="h-screen w-20 bg-yellow-400 fixed flex flex-col items-center justify-center">
      {/* <div className="bg-yellow-300 rounded-lg p-2 flex items-center justify-center w-full h-full">
        <div className="bg-yellow-500 w-12 h-12 flex items-center justify-center">
          <Image src={Logo} alt="Logo" width={40} height={40} />
        </div>
      </div> */}
    </div>
  );
};

export default FixedSidebar;
