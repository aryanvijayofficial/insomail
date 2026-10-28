import {getHomeBranding} from "./home-server-utils";
import type { MetadataRoute } from "next";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
 const branding=await getHomeBranding();
	return {
		name: branding.appName,
		short_name: branding.appName,
		description: "Email, anywhere.",
		start_url: "/inbox",
		display: "standalone",
		background_color: "#ffffff",
		theme_color: "#ffffff",
		icons: [
			{ src: "/api/branding/icon", sizes: "any", purpose: "any" },
		],
	};
}
