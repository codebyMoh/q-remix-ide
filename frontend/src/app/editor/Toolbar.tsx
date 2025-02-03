import React from "react";
import Button from "@/components/Button";

const Toolbar = () => {
  return (
    <div className="flex gap-2 mb-4">
      <Button label="Start Coding" variant="primary" />
      <Button label="2K Semaphore" />
      <Button label="ERC 20" />
    </div>
  );
};

export default Toolbar;
