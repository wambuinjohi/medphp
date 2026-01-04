import { useEffect } from 'react';
import { generateSitemapXML, getProductRoutes } from '@/utils/generateSitemap';
import { useWebCategories } from '@/hooks/useWebCategories';

export default function Sitemap() {
  const { categories } = useWebCategories();

  useEffect(() => {
    // Generate sitemap with dynamic product routes
    const dynamicRoutes = getProductRoutes(
      categories.map((cat) => ({
        slug: cat.slug,
        updatedAt: new Date().toISOString().split('T')[0],
      }))
    );

    const sitemapXML = generateSitemapXML(dynamicRoutes);

    // Set proper content type
    const blob = new Blob([sitemapXML], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sitemap.xml';

    // Instead of downloading, let's set the response header
    // For a React app, we need to handle this differently
    // Set the document content type
    document.documentElement.innerHTML = sitemapXML;
  }, [categories]);

  return null;
}
