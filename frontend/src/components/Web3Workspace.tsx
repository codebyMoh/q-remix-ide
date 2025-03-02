"use client";
import React, { useState, useMemo } from "react";
import Linkedin from "@/assets/svg/in.svg";

import {  Insta,
  X,
  Send,
  DownArrow,
  Search,
  M,
  WorkSpaceArrow} from "@/assets/index"
// Constants for static data
const TAGS = [
  "Start Coding",
  "ZK Semaphore",
  "ERC 20",
  "Uniswap V4 Hooks",
  "NFT/ERC721",
  "MultiSig",
];
const WORKSPACES = ["Default Workspace", "Team Workspace"];
const SOCIAL_LINKS = [
  { Icon: X, href: "https://x.com/quranium_org", label: "X (Twitter)" },
  {
    Icon: Linkedin,
    href: "https://www.linkedin.com/company/quranium/",
    label: "LinkedIn",
  },
  {
    Icon: Insta,
    href: "https://www.instagram.com/quraniumofficial/",
    label: "Instagram",
  },
  { Icon: Send, href: "https://t.me/quraniumofficial", label: "Send" },
  { Icon: M, href: "https://your-m-link.com", label: "M" },
];

// Reusable SocialIcon component
const SocialIcon = ({ Icon, href, label }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
    <Icon className="cursor-pointer" />
  </a>
);

// Reusable Tag component
const Tag = ({ tag, selectedTag, onClick }) => (
  <div
    onClick={() => onClick(tag)}
    className={`cursor-pointer border border-gray-300 px-2 py-1 rounded-lg text-sm ${
      selectedTag === tag ? "bg-red-600 text-white" : ""
    }`}
  >
    {tag}
  </div>
);

// Reusable WorkspaceItem component
const WorkspaceItem = ({ workspace }) => (
  <div className="flex justify-between items-center w-full p-2 text-gray-800 font-medium text-sm">
    <span>{workspace}</span>
    <DownArrow />
  </div>
);

const Web3Workspace = () => {
  const [selectedTag, setSelectedTag] = useState(TAGS[0]);

  // Memoize static data to avoid unnecessary recalculations
  const socialIcons = useMemo(
    () =>
      SOCIAL_LINKS.map((link, index) => (
        <SocialIcon
          key={index}
          Icon={link.Icon}
          href={link.href}
          label={link.label}
        />
      )),
    []
  );

  const tags = useMemo(
    () =>
      TAGS.map((tag) => (
        <Tag
          key={tag}
          tag={tag}
          selectedTag={selectedTag}
          onClick={setSelectedTag}
        />
      )),
    [selectedTag]
  );

  const workspaces = useMemo(
    () =>
      WORKSPACES.map((workspace, index) => (
        <WorkspaceItem key={index} workspace={workspace} />
      )),
    []
  );

  return (
    <div>
      <div className="w-[400px] p-8 flex flex-col gap-4 border-r border-[#DEDEDE]">
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Remix</h1>
          <div className="flex gap-2">{socialIcons}</div>
        </div>

        {/* Search Input */}
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Search document"
            className="w-full p-2 pr-10 border border-gray-200 rounded-md placeholder:text-sm"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>

        {/* Description */}
        <div className="text-gray-500 text-base text-[16px]">
          <p>The Native IDE for web3 Development</p>
          <div className="flex gap-5 underline">
            <span className="text-[16px]">
              <a
                href="https://www.quranium.org/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Website
              </a>
            </span>

            <span className="text-[16px] cursor-pointer">
              <span className="text-[16px]">
                <a
                  href="https://www.quranium.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Remix Desktop
                </a>
              </span>
            </span>
          </div>
        </div>

        <hr className="h-[1px] bg-[#dedede33] border-0" />

        {/* Explore Section */}
        <div>
          <h2 className="text-lg font-semibold">Explore. Prototype. Create.</h2>
          <div className="flex flex-wrap gap-2 pt-2">{tags}</div>
        </div>

        {/* Recent Workspace */}
        <div>
          <h2 className="text-md font-semibold">Recent Workspace</h2>
          <div className="flex gap-2 items-center mt-2">
            <WorkSpaceArrow />
            <div className="flex flex-col w-full">{workspaces}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Web3Workspace;
