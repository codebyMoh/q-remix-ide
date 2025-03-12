"use client";
import React, { useState, useMemo, useEffect } from "react";
import Linkedin from "@/assets/svg/in.svg";
import Tooltip from "@/components/Tooltip";
import {
  Insta,
  X,
  Send,
  DownArrow,
  Search,
  M,
  WorkSpaceArrow,
} from "@/assets/index";
import { useEditor } from "@/context/EditorContext";
const TAGS = [
  {
    label: "Start Coding",
    content: "Start coding using the default template.",
  },
  {
    label: "ZK Semaphore",
    content: "Create a new ZK Project with circum using this template.",
  },
  { label: "ERC 20", content: "Create a new ERC20 token using this template." },
  {
    label: "Uniswap V4 Hooks",
    content: "Create a new workspace based on this template.",
  },
  {
    label: "NFT/ERC721",
    content: "Create a new ERC721 token using this template.",
  },
  {
    label: "MultiSig",
    content: "Create a new MultiSig wallet using this template.",
  },
];

// const WORKSPACES = ["Default Workspace", "Team Workspace"];
const SOCIAL_LINKS = [
  { Icon: X, href: "https://x.com/quranium_org", label: "X Profile" },
  {
    Icon: Linkedin,
    href: "https://www.linkedin.com/company/quranium/",
    label: "LinkedIn Profile",
  },
  {
    Icon: Insta,
    href: "https://www.instagram.com/quraniumofficial/",
    label: "Instagram Profile",
  },
  {
    Icon: Send,
    href: "https://t.me/quraniumofficial",
    label: "Join us on Discord",
  },
  { Icon: M, href: "https://quranium-org.medium.com/", label: "Medium Posts" },
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
const WorkspaceItem = ({ workspace,setSelectedWorkspace }) => (
  <div className="flex justify-between items-center w-full text-gray-800 font-medium text-sm">
    <div className="flex gap-2 align-center">
      <WorkSpaceArrow />
    <span className="pt-[7px] cursor-pointer" onClick={()=>setSelectedWorkspace(workspace)}>{workspace.name}</span>
    </div>
    <DownArrow />
  </div>
);

const Web3Workspace = () => {
  const [selectedTag, setSelectedTag] = useState(TAGS[0].label);
  const { allWorkspace,setSelectedWorkspace} = useEditor();
  const RecentWorkspace = useMemo(
    () => [...allWorkspace].slice(-3).reverse(),
    [allWorkspace]
  );

  // Memoize static data to avoid unnecessary recalculations
  const socialIcons = useMemo(
    () =>
      SOCIAL_LINKS.map((link, index) => (
        <Tooltip content={link.label} key={index}>
          <SocialIcon Icon={link.Icon} href={link.href} label={link.label} />
        </Tooltip>
      )),
    []
  );

  const tags = useMemo(
    () =>
      TAGS.map((tag) => (
        <Tooltip content={tag.content} key={tag.label}>
          <Tag
            tag={tag.label}
            selectedTag={selectedTag}
            onClick={setSelectedTag}
          />
        </Tooltip>
      )),
    [selectedTag]
  );
  const workspaces = useMemo(
    () =>
      RecentWorkspace.map((workspace, index) => (
        <WorkspaceItem key={index} workspace={workspace}setSelectedWorkspace={setSelectedWorkspace} />
      )),
    [RecentWorkspace]
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
        <div className="text-gray-500 text-base ">
          <p className="text-[16px]">The Native IDE for web3 Development</p>
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
          <h2 className="text-md font-semibold pb-[4px]">Recent Workspace</h2>
            <div className="flex flex-col w-full gap-[0.2rem]">{workspaces}</div>
          </div>
      
      </div>
    </div>
  );
};

export default Web3Workspace;
