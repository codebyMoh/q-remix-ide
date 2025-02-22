"use client";
import React, { useState, useMemo } from "react";
import { Rectangle, SmallRectangle } from "@/assets/index";
import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
const FeaturesShow = () => {
  const [selectedLanguage, setSelectedLanguage] = useState("EN");

  // Memoize languages array to prevent unnecessary recalculations
  const languages = useMemo(
    () => [
      { code: "EN", label: "English" },
      { code: "ES", label: "Spanish" },
      { code: "FR", label: "French" },
      { code: "IT", label: "Italian" },
      { code: "KO", label: "Korean" },
      { code: "RU", label: "Russian" },
      { code: "ZH", label: "Chinese" },
    ],
    []
  );
  const plugins = [
    { id: 1, text: "one plugin" },
    { id: 2, text: "two plugin" },
    { id: 3, text: "three plugin" },
  //   { id: 4, text: "four plugin" },
  //  { id: 5, text: "five plugin" },
    // { id: 6, text: "six plugin"},
    // { id: 7, text: "seven plugin" },
    // { id: 8, text: "eight plugin" },
    // { id: 9, text: "nine plugin"},
    // { id: 10, text: "ten plugin"}
  ];
  const features = [
    {
      featuredName: "Featured Name",
      workspace: "Workspace",
    },
    {
      featuredName: "Featured Name",
      workspace: "Workspace",
    },
    {
      featuredName: "Featured Name",
      workspace: "Workspace",
    },
    {
      featuredName: "Featured Name",
      workspace: "Workspace",
    },
  ];
  const responsive = {
    desktop: {
      breakpoint: { max: 3000, min: 1024 },
      items: 1,
      slidesToSlide: 1,
    },
    tablet: {
      breakpoint: { max: 1024, min: 464 },
      items: 1,
      slidesToSlide: 1,
    },
    mobile: {
      breakpoint: { max: 464, min: 0 },
      items: 1,
      slidesToSlide: 1,
    },
  };

  return (
    <div className="w-full max-w-full overflow-y-auto overflow-x-hidden pt-[3.3rem] px-8">
      <div className="max-w-full">
        {/* Select language */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="font-semibold text-2xl">Features</h1>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="border border-[#E7E7E7] p-2 rounded-md"
          >
            {languages.map((language) => (
              <option
                key={language.code}
                value={language.code}
                className="text-[#94969C]"
              >
                {language.label}
              </option>
            ))}
          </select>
        </div>

        {/* Features Carousel */}
        <div className="w-full max-w-full">
          <Carousel
            swipeable={true}
            draggable={true}
            showDots={true}
            autoPlay={true}
            responsive={responsive}
            arrows={false}
            infinite={true}
            autoPlaySpeed={8000}
            keyBoardControl={true}
            customTransition="all .5s"
            transitionDuration={500}
            containerClass="max-w-full"
            dotListClass="custom-dot-list-style"
            itemClass="px-2"
          >
            {features.map((data, index) => (
              <div
                key={index}
                className="h-[313px] flex rounded-lg border border-solid gap-5"
              >
                <div className="flex-shrink-0 p-[10px]">
                  <Rectangle/>
                </div>
                <div className="flex flex-col justify-center">
                  <h3 className="font-semibold">{data.featuredName}</h3>
                  <div className="text-sm font-medium text-[#94969C]">
                    {data.workspace}
                  </div>
                </div>
              </div>
            ))}
          </Carousel>
        </div>

        {/* Features Plugins */}
        <div>
          <h2 className="font-semibold text-[22px] pt-6">Features Plugins</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-5 pt-4">
          {plugins.map((plugin, index) => (
            <div
              key={index}
              className="h-[167px] p-4 rounded-lg border border-black/10"
            >
              <div>
                <SmallRectangle />
                <div className="mt-2">{plugin.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeaturesShow;
