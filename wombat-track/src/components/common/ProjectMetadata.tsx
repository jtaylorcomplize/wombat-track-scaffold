import React from 'react';
import { ExternalLink, Code, FileText, Link, Shield } from 'lucide-react';
import type { Project } from '../../types/phase';

interface ProjectMetadataProps {
  project: Project;
  className?: string;
}

export const ProjectMetadata: React.FC<ProjectMetadataProps> = ({ 
  project, 
  className = '' 
}) => {
  const hasMetadata = project.techStack?.length || 
                      project.outputFiles?.length || 
                      project.repoRefs?.length || 
                      project.governanceLinks?.length;

  if (!hasMetadata) {
    return null;
  }

  return (
    <div className={`bg-gray-50 rounded-lg p-4 space-y-4 ${className}`}>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Project Metadata</h4>
      
      {/* Tech Stack */}
      {project.techStack && project.techStack.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Code className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Tech Stack</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {project.techStack.map((tech, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Output Files */}
      {project.outputFiles && project.outputFiles.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Key Outputs</span>
          </div>
          <div className="space-y-1">
            {project.outputFiles.map((file, index) => (
              <div 
                key={index}
                className="text-xs text-gray-600 font-mono bg-white px-2 py-1 rounded border"
              >
                {file}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Repository References */}
      {project.repoRefs && project.repoRefs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Repository Links</span>
          </div>
          <div className="space-y-1">
            {project.repoRefs.map((repo, index) => (
              <a 
                key={index}
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-purple-600 hover:text-purple-800 bg-white px-2 py-1 rounded border hover:border-purple-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="truncate">{repo.url}</span>
                {repo.branch && (
                  <span className="text-gray-500">({repo.branch})</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Governance Links */}
      {project.governanceLinks && project.governanceLinks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-gray-700">Governance</span>
          </div>
          <div className="space-y-1">
            {project.governanceLinks.map((govLink, index) => (
              <a 
                key={index}
                href={govLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-amber-600 hover:text-amber-800 bg-white px-2 py-1 rounded border hover:border-amber-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="capitalize">{govLink.type}</span>
                {govLink.description && (
                  <span className="text-gray-500">- {govLink.description}</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};