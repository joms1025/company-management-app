
import React, { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  // Specify that the icon is a ReactElement whose props are SVGProps
  icon: React.ReactElement<React.SVGProps<SVGSVGElement>>;
  children: ReactNode;
  iconBgColor?: string; // e.g., 'bg-primary-light'
  iconTextColor?: string; // e.g., 'text-primary-dark'
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, icon, children, iconBgColor = 'bg-primary-light dark:bg-primary-dark', iconTextColor = 'text-primary-dark dark:text-primary-lightest' }) => {
  return (
    <div className="bg-neutral-lightest dark:bg-neutral-dark shadow-xl rounded-xl p-6 group transform hover:scale-102 transition-transform duration-300 ease-out">
      <div className="flex items-center mb-4">
        <div className={`p-3 rounded-full mr-4 ${iconBgColor} ${iconTextColor} transition-transform duration-300 ease-out group-hover:animate-subtle-bounce`}>
          {/* Merge className with existing classes on the icon, and trim whitespace */}
          {React.cloneElement(icon, { 
            className: `h-7 w-7 ${icon.props.className || ''}`.trim() 
          })}
        </div>
        <h3 className="text-xl font-semibold text-neutral-darkest dark:text-neutral-lightest">{title}</h3>
      </div>
      <div className="text-neutral-dark dark:text-neutral-light text-sm">
        {children}
      </div>
    </div>
  );
};

export default DashboardCard;