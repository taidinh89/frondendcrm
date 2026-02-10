import React from 'react';
import MediaManager from '../../components/Core/MediaManager';

const MediaLibraryPage = () => {
    return (
        <div className="h-screen overflow-hidden">
            <MediaManager isStandalone={true} />
        </div>
    );
};

export default MediaLibraryPage;