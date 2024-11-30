import React, { createContext, useContext } from 'react';

const SoundContext = createContext();

export const SoundProvider = ({ children }) => {
  const playSound = () => {
    const audio = new Audio('/sounds/notification.mp3'); // Путь к вашему звуку
    audio.play();
  };

  return (
    <SoundContext.Provider value={{ playSound }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => useContext(SoundContext);
