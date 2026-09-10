import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Provider as UrqlProvider } from 'urql';
import App from './App.tsx';
import { gqlClient } from './client/urql';
import './index.css';
import { BookingActionsProvider } from './shared/BookingActionsContext';
import { SessionProvider } from './shared/SessionContext';
import { theme } from './theme';
import { TutorialProvider } from './tutorial/TutorialContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications />
      <UrqlProvider value={gqlClient}>
        <SessionProvider>
          <BookingActionsProvider>
            <HashRouter>
              <TutorialProvider>
                <App />
              </TutorialProvider>
            </HashRouter>
          </BookingActionsProvider>
        </SessionProvider>
      </UrqlProvider>
    </MantineProvider>
  </StrictMode>,
);
