import React, { useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { motion } from "framer-motion";

const StaggeredDropDown = ({ language, setLanguage, languageOptions }) => {
  const [open, setOpen] = useState(false);

  return (
    <motion.div animate={open ? "open" : "closed"} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2 rounded-md text-white bg-purple-700 hover:bg-purple-600"
      >
        <span className="font-medium text-sm">{language}</span>
        <motion.span variants={iconVariants}>
          <FiChevronDown />
        </motion.span>
      </button>

      <motion.ul
        initial={wrapperVariants.closed}
        variants={wrapperVariants}
        style={{ originY: "top", translateX: "-50%" }}
        className="flex flex-col gap-2 p-2 rounded-lg bg-[#2a223a] text-white shadow-xl absolute top-[120%] left-[50%] w-48 overflow-hidden"
      >
        {Object.keys(languageOptions).map((lang) => (
          <Option
            key={lang}
            setOpen={setOpen}
            text={lang.charAt(0).toUpperCase() + lang.slice(1)}
            onClick={() => {
              setLanguage(lang);
              // Assuming you want to set the default code for the language as well
              setCode(languageOptions[lang].defaultCode);
            }}
          />
        ))}
      </motion.ul>
    </motion.div>
  );
};

const Option = ({ text, setOpen, onClick }) => {
  return (
    <motion.li
      variants={itemVariants}
      onClick={() => {
        setOpen(false);
        onClick(); // Execute the language change when clicked
      }}
      className="cursor-pointer flex items-center gap-2 w-full p-2 text-xs font-medium whitespace-nowrap rounded-md hover:bg-purple-800 text-white hover:text-purple-300"
      >
      <span>{text}</span>
    </motion.li>
  );
};

export default StaggeredDropDown;

// Animation variants (same as the ones you provided)
const wrapperVariants = {
  open: {
    scaleY: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
  closed: {
    scaleY: 0,
    transition: {
      when: "afterChildren",
      staggerChildren: 0.1,
    },
  },
};

const iconVariants = {
  open: { rotate: 180 },
  closed: { rotate: 0 },
};

const itemVariants = {
  open: {
    opacity: 1,
    y: 0,
    transition: {
      when: "beforeChildren",
    },
  },
  closed: {
    opacity: 0,
    y: -15,
    transition: {
      when: "afterChildren",
    },
  },
};
