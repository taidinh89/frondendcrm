import React from 'react';
import MediaManager from '../../components/MediaManager';

const MediaLibraryPage = () => {
    return (
        <div className="h-screen overflow-hidden">
            <MediaManager isStandalone={true} />
        </div>
    );
};

export default MediaLibraryPage;