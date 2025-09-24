"use client";
import React from "react";

// Import SVGs as URLs (Next will treat these as static assets)
import iconFeedUrl from "@super/svg/iconFeed.svg";
import iconDiamondUrl from "@super/svg/iconDiamond.svg";
import iconPostsUrl from "@super/svg/iconPosts.svg";
import iconHashtagUrl from "@super/svg/iconHashtag.svg";
import iconWalletUrl from "@super/svg/iconWallet.svg";
import iconSearchUrl from "@super/svg/iconSearch.svg";
import iconMobileMenuUrl from "@super/svg/iconMobileMenu.svg";
import iconThreeDotsUrl from "@super/svg/iconThreeDots.svg";
import iconPlusUrl from "@super/svg/iconPlus.svg";
import iconUserUrl from "@super/svg/iconUser.svg";
import iconReplyUrl from "@super/svg/iconReply.svg";
import iconShareUrl from "@super/svg/iconShare.svg";
import iconFilterUrl from "@super/svg/iconFilter.svg";
import iconSortUrl from "@super/svg/iconSort.svg";
import headerLogoUrl from "@super/svg/headerLogo.svg";
import iconCommentUrl from "@super/svg/iconComment.svg";
import iconPicturesUrl from "@super/svg/iconPictures.svg";
import externalLinkUrl from "@super/svg/externalLink.svg";
import iconCloseUrl from "@super/svg/iconClose.svg";
import iconSmileUrl from "@super/svg/iconSmile.svg";
import iconGifUrl from "@super/svg/iconGif.svg";

type IconProps = { className?: string; title?: string } & React.ComponentProps<"img">;
function asIcon(url: string) {
  // Return a small React component that renders the SVG URL as an image
  return function Icon(props: IconProps) {
    const { className, title, ...rest } = props;
    return <img src={url as unknown as string} alt={title || ""} className={className} {...rest} />;
  };
}

export const IconFeed = asIcon(iconFeedUrl);
export const IconDiamond = asIcon(iconDiamondUrl);
export const IconPosts = asIcon(iconPostsUrl);
export const IconHashtag = asIcon(iconHashtagUrl);
export const IconWallet = asIcon(iconWalletUrl);
export const IconSearch = asIcon(iconSearchUrl);
export const IconMobileMenu = asIcon(iconMobileMenuUrl);
export const IconThreeDots = asIcon(iconThreeDotsUrl);
export const IconPlus = asIcon(iconPlusUrl);
export const IconUser = asIcon(iconUserUrl);
export const IconReply = asIcon(iconReplyUrl);
export const IconShare = asIcon(iconShareUrl);
export const IconFilter = asIcon(iconFilterUrl);
export const IconSort = asIcon(iconSortUrl);
export const HeaderLogo = asIcon(headerLogoUrl);
export const IconComment = asIcon(iconCommentUrl);
export const IconImage = asIcon(iconPicturesUrl);
export const IconLink = asIcon(externalLinkUrl);
export const IconClose = asIcon(iconCloseUrl);
export const IconSmile = asIcon(iconSmileUrl);
export const IconGif = asIcon(iconGifUrl);


