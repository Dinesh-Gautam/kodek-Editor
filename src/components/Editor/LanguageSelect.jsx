import '../../styles/Editor/LanguageSelect.css';

export const LanguageSelect = ({ language, setLanguage, languageOptions }) => {
  return (
    <select
      className="language-select"
      value={language}
      onChange={(e) => {
        setLanguage(e.target.value);
      }}
    >
      {Object.keys(languageOptions).map((lang) => (
        <option
          key={lang}
          value={lang}
        >
          {lang.charAt(0).toUpperCase() + lang.slice(1)}
        </option>
      ))}
    </select>
  );
};
