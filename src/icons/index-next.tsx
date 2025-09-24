import React from "react";

import iconFeedUrl from "../svg/iconFeed.svg";
import iconDiamondUrl from "../svg/iconDiamond.svg";
import iconPostsUrl from "../svg/iconPosts.svg";
import iconHashtagUrl from "../svg/iconHashtag.svg";
import iconWalletUrl from "../svg/iconWallet.svg";
import iconSearchUrl from "../svg/iconSearch.svg";
import iconMobileMenuUrl from "../svg/iconMobileMenu.svg";
import iconThreeDotsUrl from "../svg/iconThreeDots.svg";
import iconPlusUrl from "../svg/iconPlus.svg";
import iconUserUrl from "../svg/iconUser.svg";
import iconReplyUrl from "../svg/iconReply.svg";
import iconShareUrl from "../svg/iconShare.svg";
import iconFilterUrl from "../svg/iconFilter.svg";
import iconSortUrl from "../svg/iconSort.svg";
import headerLogoUrl from "../svg/headerLogo.svg";
import iconCommentUrl from "../svg/iconComment.svg";
import iconPicturesUrl from "../svg/iconPictures.svg";
import externalLinkUrl from "../svg/externalLink.svg";
import iconCloseUrl from "../svg/iconClose.svg";
import iconSmileUrl from "../svg/iconSmile.svg";
import iconGifUrl from "../svg/iconGif.svg";

type IconProps = { className?: string; title?: string } & React.ComponentProps<"img">;

function asIcon(url: string) {
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


