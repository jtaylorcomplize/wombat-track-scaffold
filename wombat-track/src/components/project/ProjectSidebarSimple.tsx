import React from 'react';
import { ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { Disclosure } from '@headlessui/react';
import { cn } from '../../utils/classNames';

type SidebarItemProps = {
  name: string;
  children?: React.ReactNode;
  isOpen?: boolean;
};

const SidebarItem: React.FC<SidebarItemProps> = ({ name, children, isOpen = false }) => {
  return (
    <Disclosure defaultOpen={isOpen}>
      {({ open }) => (
        <div className="space-y-1">
          <Disclosure.Button
            className={cn(
              'flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-left',
              'hover:bg-gray-100 rounded-md'
            )}
          >
            <div className="flex items-center space-x-2">
              {open ? <FolderOpen size={16} /> : <Folder size={16} />}
              <span>{name}</span>
            </div>
            <ChevronRight
              className={cn('transform transition-transform', open && 'rotate-90')}
              size={16}
            />
          </Disclosure.Button>
          <Disclosure.Panel className="pl-6">{children}</Disclosure.Panel>
        </div>
      )}
    </Disclosure>
  );
};

const ProjectSidebarSimple: React.FC = () => {
  return (
    <div className="w-64 bg-white border-r border-gray-200">
      <SidebarItem name="Project 1" isOpen>
        <SidebarItem name="Phase 1">
          <SidebarItem name="Step 1" />
          <SidebarItem name="Step 2" />
        </SidebarItem>
        <SidebarItem name="Phase 2">
          <SidebarItem name="Step 1" />
        </SidebarItem>
      </SidebarItem>
      <SidebarItem name="Project 2" />
    </div>
  );
};

export default ProjectSidebarSimple;