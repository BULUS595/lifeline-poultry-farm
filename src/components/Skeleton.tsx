import React from 'react';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    borderRadius?: string | number;
    className?: string;
    circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    width,
    height,
    borderRadius,
    className = '',
    circle = false
}) => {
    const style: React.CSSProperties = {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: circle ? '50%' : borderRadius,
    };

    return <div className={`skeleton ${className}`} style={style} />;
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
    lines = 1,
    className = ''
}) => {
    return (
        <div className={`flex flex-col gap-sm ${className}`}>
            {[...Array(lines)].map((_, i) => (
                <Skeleton
                    key={i}
                    width={i === lines - 1 && lines > 1 ? '70%' : '100%'}
                    height="1em"
                />
            ))}
        </div>
    );
};
