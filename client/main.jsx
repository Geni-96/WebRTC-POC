import React from 'react';
import { createRoot } from 'react-dom/client';
import { Meteor } from 'meteor/meteor';
import App from '../imports/ui/App';
// import VideoCall from '../imports/ui/VideoCall';

Meteor.startup(() => {
  createRoot(document.getElementById('react-target')).render(<App />);
});
